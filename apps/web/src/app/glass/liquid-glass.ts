import { DOCUMENT, Service, effect, inject } from '@angular/core';
import { Theme } from '../theme/theme';

const maxLenses = 8;
const idleFrames = 30;

export type Optics = [blur: number, refraction: number, edge: number, light: number];

const vertexShader = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_imageSize;
uniform float u_scale;
uniform int u_count;
uniform vec4 u_rects[${maxLenses}];
uniform float u_radii[${maxLenses}];
uniform vec4 u_optics[${maxLenses}];

vec2 cover(vec2 p) {
  float s = max(u_resolution.x / u_imageSize.x, u_resolution.y / u_imageSize.y);
  vec2 size = u_imageSize * s;
  return (p - (u_resolution - size) * 0.5) / size;
}

float box(vec2 p, vec2 extent, float r) {
  vec2 q = abs(p) - extent + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 frost(vec2 p, float blur) {
  vec2 o = vec2(8.0 * u_scale, 0.0);
  return (
    texture2D(u_image, cover(p), blur).rgb * 2.0 +
    texture2D(u_image, cover(p + o.xy), blur).rgb +
    texture2D(u_image, cover(p - o.xy), blur).rgb +
    texture2D(u_image, cover(p + o.yx), blur).rgb +
    texture2D(u_image, cover(p - o.yx), blur).rgb
  ) / 6.0;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec3 color = texture2D(u_image, cover(p)).rgb;
  for (int i = 0; i < ${maxLenses}; i++) {
    if (i >= u_count) break;
    vec2 extent = u_rects[i].zw * 0.5;
    vec2 local = p - u_rects[i].xy - extent;
    float r = min(u_radii[i], min(extent.x, extent.y));
    float d = box(local, extent, r);
    float coverage = clamp(0.5 - d / u_scale, 0.0, 1.0);
    if (coverage <= 0.0) continue;
    vec2 e = vec2(1.0, 0.0);
    vec2 n = normalize(vec2(
      box(local + e.xy, extent, r) - box(local - e.xy, extent, r),
      box(local + e.yx, extent, r) - box(local - e.yx, extent, r)
    ) + 1e-5);
    vec4 optics = u_optics[i];
    float rim = min(optics.z * u_scale, min(extent.x, extent.y) * 0.8);
    float k = 1.0 - clamp(-d / rim, 0.0, 1.0);
    vec2 shift = n * k * k * k * rim * optics.y;
    vec3 lens = vec3(
      frost(p + shift * 1.1, optics.x).r,
      frost(p + shift, optics.x).g,
      frost(p + shift * 0.9, optics.x).b
    );
    float edge = 1.0 - smoothstep(0.0, 2.0 * u_scale, max(-d, 0.0));
    float light = abs(dot(n, normalize(vec2(-0.6, -1.0))));
    lens += edge * light * optics.w + k * k * 0.08;
    color = mix(color, lens, coverage);
  }
  gl_FragColor = vec4(color, 1.0);
}`;

interface Program {
  gl: WebGLRenderingContext;
  resolution: WebGLUniformLocation | null;
  imageSize: WebGLUniformLocation | null;
  scale: WebGLUniformLocation | null;
  count: WebGLUniformLocation | null;
  rects: WebGLUniformLocation | null;
  radii: WebGLUniformLocation | null;
  optics: WebGLUniformLocation | null;
}

@Service()
export class LiquidGlass {
  private readonly document = inject(DOCUMENT);
  private readonly theme = inject(Theme);
  private readonly lenses = new Map<HTMLElement, { radius: number; optics: Optics }>();
  private resizes?: ResizeObserver;
  private canvas?: HTMLCanvasElement;
  private program?: Program;
  private imageSize: [number, number] = [1, 1];
  private backdrop = '';
  private disabled = false;
  private frame = 0;
  private idle = 0;
  private last = '';

  constructor() {
    effect(() => {
      this.theme.mode();
      this.loadBackdrop();
    });

  }

  add(element: HTMLElement, optics: Optics): void {
    const known = this.lenses.get(element);
    if (!known && this.lenses.size >= maxLenses) {
      return;
    }
    this.start();
    if (this.disabled) {
      return;
    }
    const radius = known?.radius ?? (parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0);
    this.lenses.set(element, { radius, optics });
    if (!known) {
      element.classList.add('lens');
      this.resizes?.observe(element);
    }
    this.last = '';
    this.wake();
  }

  delete(element: HTMLElement): void {
    if (this.lenses.delete(element)) {
      element.classList.remove('lens');
      this.resizes?.unobserve(element);
      this.wake();
    }
  }

  private start(): void {
    if (this.canvas || this.disabled) {
      return;
    }
    const window = this.document.defaultView;
    if (
      !window ||
      !('WebGLRenderingContext' in window) ||
      window.matchMedia('(prefers-reduced-transparency: reduce)').matches
    ) {
      this.disabled = true;
      return;
    }
    const canvas = this.document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    const program = gl && this.compile(gl);
    if (!program) {
      this.disabled = true;
      return;
    }
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;visibility:hidden';
    canvas.addEventListener('webglcontextlost', () => this.stop());
    this.document.body.append(canvas);
    this.canvas = canvas;
    this.program = program;

    const wake = () => this.wake();
    this.resizes = new ResizeObserver(wake);
    window.addEventListener('resize', wake);
    for (const type of ['transitionrun', 'animationstart', 'scroll']) {
      this.document.addEventListener(type, wake, { capture: true, passive: true });
    }
    this.loadBackdrop();
  }

  private stop(): void {
    this.disabled = true;
    cancelAnimationFrame(this.frame);
    this.document.documentElement.classList.remove('liquid');
    this.canvas?.remove();
  }

  private compile(gl: WebGLRenderingContext): Program | null {
    const shader = (type: number, source: string) => {
      const created = gl.createShader(type)!;
      gl.shaderSource(created, source);
      gl.compileShader(created);
      return created;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return null;
    }
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const at = (name: string) => gl.getUniformLocation(program, name);
    return {
      gl,
      resolution: at('u_resolution'),
      imageSize: at('u_imageSize'),
      scale: at('u_scale'),
      count: at('u_count'),
      rects: at('u_rects'),
      radii: at('u_radii'),
      optics: at('u_optics'),
    };
  }

  private async loadBackdrop(): Promise<void> {
    if (!this.program) {
      return;
    }
    const url = `/backdrops/${this.theme.mode()}.webp`;
    this.backdrop = url;
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      if (this.backdrop === url) {
        this.stop();
      }
      return;
    }
    if (!this.program || this.backdrop !== url) {
      return;
    }
    const pot = this.document.createElement('canvas');
    pot.width = 2048;
    pot.height = 1024;
    pot.getContext('2d')?.drawImage(image, 0, 0, pot.width, pot.height);
    const { gl } = this.program;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pot);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.imageSize = [image.naturalWidth, image.naturalHeight];
    this.last = '';
    this.canvas?.style.removeProperty('visibility');
    this.document.documentElement.classList.add('liquid');
    this.wake();
  }

  private wake(): void {
    this.idle = 0;
    if (!this.frame && this.program) {
      this.frame = requestAnimationFrame(() => this.tick());
    }
  }

  private tick(): void {
    this.frame = 0;
    const { canvas, program } = this;
    if (!canvas || !program) {
      return;
    }
    const scale = Math.min(devicePixelRatio, 2);
    const width = Math.round(canvas.clientWidth * scale);
    const height = Math.round(canvas.clientHeight * scale);
    const rects: number[] = [];
    const radii: number[] = [];
    const optics: number[] = [];
    for (const [element, lens] of this.lenses) {
      const box = element.getBoundingClientRect();
      if (box.width && box.height) {
        rects.push(box.left * scale, box.top * scale, box.width * scale, box.height * scale);
        radii.push(lens.radius * scale);
        optics.push(...lens.optics);
      }
    }
    const key = `${width}x${height}:${rects.join()}`;
    if (key !== this.last) {
      this.last = key;
      this.idle = 0;
      this.draw(program, canvas, width, height, scale, rects, radii, optics);
    }
    if (++this.idle < idleFrames) {
      this.frame = requestAnimationFrame(() => this.tick());
    }
  }

  private draw(
    { gl, ...at }: Program,
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    scale: number,
    rects: number[],
    radii: number[],
    optics: number[],
  ): void {
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    const count = radii.length;
    gl.uniform2f(at.resolution, width, height);
    gl.uniform2f(at.imageSize, ...this.imageSize);
    gl.uniform1f(at.scale, scale);
    gl.uniform1i(at.count, count);
    if (count) {
      gl.uniform4fv(at.rects, rects);
      gl.uniform1fv(at.radii, radii);
      gl.uniform4fv(at.optics, optics);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
