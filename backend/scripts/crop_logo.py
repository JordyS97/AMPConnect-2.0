from PIL import Image
import sys
import os

def crop_image(input_path, output_path):
    try:
        if not os.path.exists(input_path):
            print(f"Input file not found: {input_path}")
            sys.exit(1)

        img = Image.open(input_path)
        img = img.convert("RGBA")
        
        # Get bounding box of non-zero alpha pixels
        bbox = img.getbbox()
        
        if bbox:
            # Crop the image to the bounding box
            cropped_img = img.crop(bbox)
            cropped_img.save(output_path)
            print(f"Successfully cropped image. Original size: {img.size}, New size: {cropped_img.size}")
            print(f"Saved to: {output_path}")
        else:
            print("Image is completely transparent, nothing to crop.")
            
    except ImportError:
        print("PIL/Pillow module not found. Please install it with 'pip install Pillow'")
        sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python crop_logo.py <input_path> <output_path>")
        sys.exit(1)
    
    crop_image(sys.argv[1], sys.argv[2])
