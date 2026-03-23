# Video Template Automation (Windows Compatible)

Author: Yash Srivastava

Create dynamic videos with a freeze frame transition, background removal, and slideshow effect. This version has been optimized for Windows and uses automatic FFmpeg management.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   FAL_KEY=your_fal_ai_key_here
   STORAGE_URL=./output
   PORT=3002
   ```
   *Note: Get your FAL_KEY from [fal.ai](https://fal.ai/). Ensure you have a positive balance.*

## Usage

### API Server (Recommended)

Start the server:
```bash
npm start
```

The server will run on `http://localhost:3002` (or the port specified in `.env`).

#### Web Interface
Open `http://localhost:3002` in your browser to use the graphical interface for uploading videos and images.

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/process` | Process video and images |
| POST | `/upload-video` | Upload a local video file |
| POST | `/upload-images` | Upload multiple image files |
| GET | `/download/:filename` | Download processed results |

## Windows Optimization Details

This project has been updated to work seamlessly on Windows:
- **FFmpeg/FFprobe**: Automatically managed via `ffmpeg-static` and `ffprobe-static`. No manual installation or PATH setup required.
- **Image Processing**: Uses `sharp` instead of `sips` or ImageMagick for better performance and cross-platform compatibility.
- **Path Handling**: Fixed Windows backslash issues in FFmpeg commands.

## Troubleshooting

- **Error: Forbidden (403)**: This usually means your fal.ai balance is exhausted. Top up at [fal.ai/dashboard/billing](https://fal.ai/dashboard/billing).
- **Port already in use**: If port 3002 is busy, change the `PORT` value in your `.env` file.
- **Protocol "c:" not supported**: This was a path handling bug that has been fixed. Ensure you are using the latest version of `server.js`.

## Requirements
- Node.js 18+
- Internet connection (for AI background removal)
