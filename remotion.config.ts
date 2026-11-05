import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
// Hardware (GPU) encoding can't use CRF — `npm run render -- <slug> --gpu` sets a bitrate instead
if (!process.env.KETTEK_GPU) Config.setCrf(18);
