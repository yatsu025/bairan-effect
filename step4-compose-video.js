const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ffmpeg = require('fluent-ffmpeg');

const workDir = process.argv[2] || '.';
const OUTPUT_DIR = path.join(workDir, 'output');
const FFMPEG = require('ffmpeg-static');
const FFPROBE = require('ffprobe-static').path;

ffmpeg.setFfmpegPath(FFMPEG);
ffmpeg.setFfprobePath(FFPROBE);

const MAIN = path.join(workDir, 'main-video.MP4');
const MIDDLE_SLIDESHOW = path.join(OUTPUT_DIR, 'middle-slideshow.mp4');
const MIDDLE_VIDEO = path.join(workDir, 'middle-video.mp4');
const MIDDLE = fs.existsSync(MIDDLE_SLIDESHOW) ? MIDDLE_SLIDESHOW : MIDDLE_VIDEO;
const STICKER = path.join(OUTPUT_DIR, 'bordered-image.png');
const OUTPUT = path.join(OUTPUT_DIR, 'final-video.mp4');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function getDur(file) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration);
    });
  });
}

async function main() {
  console.log('🎬 Creating CENTER-OUT curtain\n');
  console.log(`WorkDir: ${workDir}`);
  
  const middleSource = MIDDLE === MIDDLE_SLIDESHOW ? 'middle-slideshow' : 'middle-video';
  console.log(`Using: ${middleSource}\n`);
  
  const mainDur = await getDur(MAIN);
  const midDur = await getDur(MIDDLE);
  const total = mainDur + midDur;
  
  console.log(`Main: ${mainDur.toFixed(2)}s | Middle: ${midDur.toFixed(2)}s\n`);
  
  // Step 1: Extended main
  console.log('Step 1: Extended main...');
  const freezeDuration = total - mainDur;
  // Extract last frame
  await new Promise((resolve, reject) => {
    ffmpeg(MAIN)
      .seekInput(mainDur - 0.1)
      .frames(1)
      .output(path.join(OUTPUT_DIR, 'last-frame-for-loop.png'))
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  // Create looped video from last frame
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(OUTPUT_DIR, 'last-frame-for-loop.png'))
      .inputOptions(['-loop 1'])
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        '-pix_fmt yuv420p',
        '-r 30',
        `-t ${freezeDuration}`
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(path.join(OUTPUT_DIR, 'freeze-extension.mp4'));
  });

  // Concatenate original + freeze
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(MAIN)
      .input(path.join(OUTPUT_DIR, 'freeze-extension.mp4'))
      .complexFilter('[0:v][1:v]concat=n=2:v=1:a=0[out]')
      .outputOptions([
        '-map [out]',
        '-c:v libx264',
        '-preset ultrafast',
        '-pix_fmt yuv420p',
        '-r 30'
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(path.join(OUTPUT_DIR, 'extended-main.mp4'));
  });
  console.log('✓ Done\n');
  
  // Step 2: Center-out using frozen main frame as background
  console.log('Step 2: Center-out curtain (frozen main frame bg)...');
  
  // Scale middle first
  await new Promise((resolve, reject) => {
    ffmpeg(MIDDLE)
      .videoFilter('scale=1080:1920')
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        '-pix_fmt yuv420p',
        '-r 30',
        `-t ${midDur}`
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(path.join(OUTPUT_DIR, 'middle-scaled.mp4'));
  });
  
  // Extract frozen frame and loop it
  await new Promise((resolve, reject) => {
    ffmpeg(path.join(OUTPUT_DIR, 'extended-main.mp4'))
      .seekInput(mainDur - 0.1)
      .frames(1)
      .output(path.join(OUTPUT_DIR, 'frozen-frame.png'))
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(OUTPUT_DIR, 'frozen-frame.png'))
      .inputOptions(['-loop 1'])
      .videoFilter('format=yuv420p')
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        '-pix_fmt yuv420p',
        '-r 30',
        `-t ${midDur}`
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(path.join(OUTPUT_DIR, 'frozen-bg.mp4'));
  });
  
  const centerY = 960;
  const halfH = 960;
  
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(OUTPUT_DIR, 'frozen-bg.mp4'))
      .input(path.join(OUTPUT_DIR, 'middle-scaled.mp4'))
      .complexFilter([
        '[0:v]format=yuv420p[bg]',
        '[1:v]format=yuv420p[fg]',
        `[bg][fg]blend=all_expr='if(between(Y,${centerY}-(${halfH}*T/${midDur}),${centerY}+(${halfH}*T/${midDur})),B,A)':shortest=1[out]`
      ])
      .outputOptions([
        '-map [out]',
        '-c:v libx264',
        '-preset ultrafast',
        '-pix_fmt yuv420p',
        '-r 30',
        `-t ${midDur}`
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(path.join(OUTPUT_DIR, 'middle-curtain.mp4'));
  });
  console.log('✓ Done\n');
  
  // Step 3: Compose final
  console.log('Step 3: Final composition...');
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(OUTPUT_DIR, 'extended-main.mp4'))
      .input(path.join(OUTPUT_DIR, 'middle-curtain.mp4'))
      .input(STICKER)
      .complexFilter([
        `[1:v]setpts=PTS+${mainDur}/TB[mid]`,
        `[2:v]loop=-1:1,setpts=PTS+${mainDur}/TB,scale='trunc(iw*max(0.6,1-0.4*(t-${mainDur})/(${total}-${mainDur}))/2)*2:trunc(ih*max(0.6,1-0.4*(t-${mainDur})/(${total}-${mainDur}))/2)*2':eval=frame[sticker]`,
        '[0:v][mid]overlay=0:0:shortest=1[tmp]',
        '[tmp][sticker]overlay=(W-w)/2:H-h:shortest=1[out]'
      ])
      .outputOptions([
        '-map [out]',
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-r 30',
        `-t ${total}`
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(OUTPUT);
  });
  
  console.log('\n✅ Done!');
  console.log(`🎉 ${OUTPUT}`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
