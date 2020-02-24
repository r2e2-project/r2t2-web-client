'use strict';

class Point2
{
  constructor(x, y)
  {
    this.x = x;
    this.y = y;
  }

  static add(p1, p2) { return new Point2(p1.x + p2.x, p1.y + p2.y); }
  static sub(p1, p2) { return new Point2(p1.x - p2.x, p1.y - p2.y); }

  static max(p1, p2)
  {
    return new Point2(Math.max(p1.x, p2.x), Math.max(p1.y, p2.y));
  }

  static min(p1, p2)
  {
    return new Point2(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y));
  }
}

class Spectrum
{
  /**
   * @param {float} r Red
   * @param {float} g Green
   * @param {float} b Blue
   */
  constructor(r, g, b) { this.c = [ r, g, b ]; }

  get r() { return this.c[0]; }
  get g() { return this.c[1]; }
  get b() { return this.c[2]; }

  get y()
  {
    return 0.212671 * this.c[0] + 0.715160 * this.c[1] + 0.072169 * this.c[2];
  }

  mul(coeff)
  {
    for (var i in this.c) {
      this.c[i] *= coeff;
    }
  }

  add(color)
  {
    for (var i in color.c) {
      this.c[i] += color.c[i];
    }
  }
}

class Filter
{
  /**
   * @param {Point2} radius
   */
  constructor(radius)
  {
    this.radius = new Point2(radius, radius);
    this.inv_radius = new Point2(1 / radius, 1 / radius);
  }
}

class BoxFilter extends Filter
{
  /**
   * @param {Point2} radius
   */
  constructor(radius) { super(radius); }

  evaluate(point) { return 1.0; }
}

class Film
{
  static filter_table_width = 16;

  /**
   * @param {Point2} resolution
   * @param {Filter} filter
   * @param {float} scale
   * @param {float} max_sample_luminance
   */
  constructor(resolution, filter, scale, max_sample_luminance)
  {
    this.resolution = resolution;
    this.filter = filter;
    this.scale = scale;
    this.max_sample_luminance = max_sample_luminance;

    // Allocate film image storage
    this.contrib_sum = new Array(resolution.x * resolution.y * 3).fill(0.0);
    this.weight_sum = new Array(resolution.x * resolution.y).fill(0.0);

    // Precompute filter weight table
    this.filter_table
      = new Array(Film.filter_table_width * Film.filter_table_width).fill(0);

    var offset = 0;
    for (var x = 0; x < Film.filter_table_width; x++) {
      for (var y = 0; y < Film.filter_table_width; y++, offset++) {
        var point = new Point2(0, 0);
        point.x = (x + 0.5) * this.filter.radius.x / Film.filter_table_width;
        point.y = (y + 0.5) * this.filter.radius.y / Film.filter_table_width;
        this.filter_table[offset] = this.filter.evaluate(point);
      }
    }
  }

  /**
   * @param {Point2} p_film
   * @param {Spectrum} color
   * @param {float} weight
   */
  add_sample(p_film, color, weight)
  {
    if (color.y > this.max_sample_luminance) {
      color.mul(this.max_sample_luminance / color.y);
    }

    var p_film_discrete = Point2.sub(p_film, new Point2(0.5, 0.5));

    var p0 = Point2.sub(p_film_discrete, this.filter.radius);
    p0.x = Math.ceil(p0.x);
    p0.y = Math.ceil(p0.y);

    var p1 = Point2.add(p_film_discrete, this.filter.radius);
    p1.x = Math.floor(p1.x) + 1;
    p1.y = Math.floor(p1.y) + 1;
    /* TODO min-max */

    var ifx = new Array(p1.x - p0.x);
    for (var x = p0.x; x < p1.x; ++x) {
      const fx = Math.abs((x - p_film_discrete.x) * this.filter.inv_radius.x
                          * Film.filter_table_width);
      ifx[x - p0.x] = Math.min(Math.floor(fx), Film.filter_table_width - 1);
    }

    var ify = new Array(p1.y - p0.y);
    for (var y = p0.y; y < p1.y; ++y) {
      const fy = Math.abs((y - p_film_discrete.y) * this.filter.inv_radius.y
                          * Film.filter_table_width);
      ify[y - p0.y] = Math.min(Math.floor(fy), Film.filter_table_width - 1);
    }

    for (var y = p0.y; y < p1.y; ++y) {
      for (var x = p0.x; x < p1.x; ++x) {
        // Evaluate filter value at (x,y) pixel
        const offset = ify[y - p0.y] * Film.filter_table_width + ifx[x - p0.x];
        const filter_weight = this.filter_table[offset];

        // Update pixel values with filtered sample contribution
        color.mul(weight);
        color.mul(filter_weight);

        var pixel_index = x + y * this.resolution.x;
        this.contrib_sum[3 * pixel_index + 0] += color.r;
        this.contrib_sum[3 * pixel_index + 1] += color.g;
        this.contrib_sum[3 * pixel_index + 2] += color.b;
        this.weight_sum[pixel_index] += filter_weight;
      }
    }
  }

  write_image(canvas, context)
  {
    const img_data = context.getImageData(0, 0, canvas.width, canvas.height);
    var rgba = img_data.data;

    var idx = 0;
    for (var x = 0; x < this.resolution.x; x++) {
      for (var y = 0; y < this.resolution.y; y++, idx++) {
        const idx_xyz = 3 * idx;
        const idx_rgb = 4 * idx;

        const R = this.contrib_sum[idx_xyz + 0];
        const G = this.contrib_sum[idx_xyz + 1];
        const B = this.contrib_sum[idx_xyz + 2];

        if (this.weight_sum[idx] != 0) {
          const inv_wt = 1 / this.weight_sum[idx];

          rgba[idx_rgb + 0]
            = Math.ceil(Math.max(0, R * inv_wt) * this.scale * 255);

          rgba[idx_rgb + 1]
            = Math.ceil(Math.max(0, G * inv_wt) * this.scale * 255);

          rgba[idx_rgb + 2]
            = Math.ceil(Math.max(0, B * inv_wt) * this.scale * 255);
        } else {
          rgba[idx_rgb + 0] = Math.ceil(Math.max(0, R) * this.scale * 255);
          rgba[idx_rgb + 1] = Math.ceil(Math.max(0, G) * this.scale * 255);
          rgba[idx_rgb + 2] = Math.ceil(Math.max(0, B) * this.scale * 255);
        }

        rgba[idx_rgb + 3] = 255;
      }
    }

    context.putImageData(img_data, 0, 0);
  }
}
