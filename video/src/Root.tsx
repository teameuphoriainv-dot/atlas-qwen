import { Composition } from "remotion";
import { Atlas, ATLAS_FPS, ATLAS_DURATION } from "./Atlas";
import CoverScene from "./scenes/CoverScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Atlas"
        component={Atlas}
        durationInFrames={ATLAS_DURATION}
        fps={ATLAS_FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Cover"
        component={CoverScene}
        durationInFrames={1}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
