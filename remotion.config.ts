import { Config } from "@remotion/cli/config";
import { cpus } from "node:os";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
// Hardware (GPU) encoding can't use CRF — `npm run render -- <slug> --gpu` sets a bitrate instead
if (!process.env.KETTEK_GPU) Config.setCrf(18);
// GitHub's servers have no GPU: draw WebGL (object3d scenes) with SwiftShader through ANGLE
if (process.env.CI && !process.env.KETTEK_GPU) Config.setChromiumOpenGlRenderer("swangle");
// Remotion's default uses half the cores; a render server does nothing else, so use all of them
if (process.env.CI) Config.setConcurrency(cpus().length);
