## How it works

### Applying filters to what's behind the element

The standard `filter` property modifies the element itself, but `backdrop-filter` applies the filter to the *content behind* the element. This lets text and images underneath the glass panel appear refracted in real time.

By writing `backdrop-filter: url(#glass-refract)` in CSS, we reference an inline SVG filter. SVG filters let you chain multiple primitives into a pipeline, enabling complex image processing that CSS alone cannot achieve.

### The filter chain

This demo connects 5 steps in series.

1. **Zoom (feDisplacementMap)** — Slightly shifts pixels outward from the center, creating a mild magnification effect as if looking through a lens. The R/G channels of the displacement map determine the X/Y offset.
2. **Refract (feDisplacementMap)** — Uses a bezel-shaped displacement map to simulate refraction along the glass edge. A large `scale=98` value produces strong distortion.
3. **Saturate (feColorMatrix)** — Boosts the saturation of the refracted pixels. Real glass disperses light and can make colors appear more vivid — this step mimics that effect.
4. **Specular (feComposite + feComponentTransfer)** — Composites a pre-made highlight image as a mask to add a glossy sheen. A semi-transparent version created with `feFuncA` is layered on top for a soft light film.
5. **Blend (feBlend)** — Merges all layers in `normal` mode to produce the final output.

### How displacement maps work

`feDisplacementMap` shifts pixels from the first input image based on the color values of each pixel in the second input image (the map). The R channel maps to the X offset and the G channel maps to the Y offset.

A pixel with **R=128, G=128** (50% gray) produces no shift. Values above 128 shift in the positive direction; values below shift in the negative direction. This means you can design any distortion pattern simply by "painting" a displacement map.

This demo uses three images:

- **zoom.png** — A radial gradient from the center, generating the magnification effect
- **refract.png** — A bezel-shaped profile that reproduces edge refraction
- **highlight.png** — A specular reflection pattern for the glossy highlight

### Drag implementation

The drag uses the Pointer Events API. By calling `setPointerCapture`, the pointer is captured so that dragging continues even when the cursor leaves the element. The same code works for both mouse and touch input.

### Limitations and browser support

`backdrop-filter: url(#svg-filter)` is currently only supported in Chrome and Edge. Firefox supports `backdrop-filter` itself but does not support referencing SVG filters. Additionally, because `feImage` loads external images, the filter resolution is fixed to the element size — if you want to dynamically resize the glass, you would need to regenerate the map images accordingly.
