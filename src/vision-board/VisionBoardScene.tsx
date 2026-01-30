import type { Config } from "../types";
import { POSTER_WIDTH, POSTER_HEIGHT } from "./constants";
import { StarsBackground } from "./StarsBackground";
import { CoreSlot, DreamSlot } from "./SlotComponents";

interface VisionBoardSceneProps {
  config: Config;
  selectedSlot: string | null;
  onSlotClick: (slotId: string) => void;
  onPrintRequest?: () => void;
}

// Main scene component that renders inside the PixiJS Application
export function VisionBoardScene({
  config,
  selectedSlot,
  onSlotClick,
}: VisionBoardSceneProps) {
  return (
    <>
      <StarsBackground />
      <pixiContainer
        x={POSTER_WIDTH / 2}
        y={POSTER_HEIGHT / 2}
        sortableChildren
      >
        <CoreSlot
          config={config.core}
          isSelected={selectedSlot === "core"}
          onClick={() => onSlotClick("core")}
        />
        {/* Only render dream slots that exist in config */}
        {config.dreams.map((dreamConfig) => (
          <DreamSlot
            key={`dream-${dreamConfig.positionIndex}`}
            index={dreamConfig.positionIndex}
            config={dreamConfig}
            isSelected={selectedSlot === `dream-${dreamConfig.positionIndex}`}
            onClick={() => onSlotClick(`dream-${dreamConfig.positionIndex}`)}
          />
        ))}
      </pixiContainer>
    </>
  );
}
