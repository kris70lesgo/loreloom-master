import os
from PIL import Image

gif_path = "transition.gif"
out_dir = "public/sequence"

if not os.path.exists(out_dir):
    os.makedirs(out_dir)

try:
    with Image.open(gif_path) as im:
        frame_idx = 1
        
        # Initialize accumulator with a dark background to match the site
        accumulator = Image.new("RGBA", im.size, (5, 5, 5, 255))
        
        while True:
            # Paste the current frame onto the accumulator using its alpha channel as mask.
            # This correctly composites optimized GIFs where only moving parts are drawn per frame.
            frame_rgba = im.convert("RGBA")
            accumulator.paste(frame_rgba, (0, 0), frame_rgba)
            
            # Save the fully composited frame
            accumulator.save(os.path.join(out_dir, f"frame_{frame_idx:04d}.webp"), "WEBP", quality=100)
            
            frame_idx += 1
            im.seek(frame_idx - 1)
except EOFError:
    pass # End of sequence
