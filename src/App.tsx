import { ChatDialog } from "./ChatDialog";
import CircularGallery from "./components/ui/circular-gallery";

export const App = () => {
  return (
    <div>
      <ChatDialog />
      <div style={{ height: "600px", position: "relative" }}>
        <CircularGallery
          items={[]}
          bend={2}
          textColor="black"
          borderRadius={0.05}
          scrollEase={0.02}
        />
      </div>
    </div>
  );
};
