class Point2
{
  constructor(x, y)
  {
    this.x = x;
    this.y = y;
  }

  static add(p1, p2) { return new Point2(p1.x + p1.y, p2.x + p2.y); }
  static sub(p1, p2) { return new Point2(p1.x - p1.y, p2.x - p2.y); }

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

  get y() { return 0.212671 * c[0] + 0.715160 * c[1] + 0.072169 * c[2]; }

  mul(coeff)
  {
    for (var i in this.c) {
      this.c[i] *= coeff;
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
    this.radius = radius;
    this.inv_radius = [ 1 / radius.x, 1 / radius.y ];
  }
}

class BoxFilter extends Filter
{
  /**
   * @param {Point2} radius
   */
  constructor(radius) { super(radius); }
}

class Film
{
  /**
   * @param {Point2} resolution
   * @param {Filter} filter
   * @param {float} diagonal
   * @param {float} scale
   * @param {float} max_sample_luminance
   */
  constructor(resolution, filter, diagonal, scale, max_sample_luminance)
  {
    this.resolution = resolution;
    this.filter = filter;
    this.diagonal = diagonal * 0.001;
    this.scale = scale;
    this.max_sample_luminance = max_sample_luminance;

    this.pixels = new Array(resolution.x * resolution.y * 4, 0);
  }

  /**
   * @param {Point2} p_film
   * @param {Spectrum} color
   * @param {float} weight
   */
  add_sample(p_film, color, weight)
  {
    if (color.y() > this.max_sample_luminance) {
      color.mul(this.max_sample_luminance / color.y());
    }

    var p_film_discrete = Point2.sub(p_film, new Point2(0.5, 0.5));

    var p0 = Point2.sub(p_film_discrete, this.filter.radius);
    p0.x = Math.ceil(p0.x);
    p0.y = Math.ceil(p0.y);

    var p1 = Point2.add(p_film_discrete, this.filter.radius);
    p1.x = Math.floor(p1.x) + 1;
    p1.y = Math.floor(p1.y) + 1;
    /* TODO: min-max */


  }
}
