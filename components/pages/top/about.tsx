import DecryptedText from "@/components/shared/bits/DecryptedText";

export const About: React.FC = () => {
  return (
    <section>
      <h2 className="sr-only">About Me</h2>
      <div className="flex flex-col gap-4">
        <DecryptedText
          text="I'm a software engineer based in Tokyo, Japan."
          maxIterations={20}
          revealDirection="center"
          animateOn="view"
        />
        <DecryptedText
          text="I work at the intersection of technology and culture, creating interactive experiences that often involve entertainment, design, and web innovation. I enjoy building tools, experimenting with new ideas, and collaborating with creators from various fields."
          maxIterations={30}
          revealDirection="center"
          animateOn="view"
        />
        <DecryptedText
          text="Outside of work, I spend time exploring Tokyo, playing poker or mahjong, and working on side projects."
          maxIterations={40}
          revealDirection="center"
          animateOn="view"
        />
        <DecryptedText
          text="This is an AI-written overview of JJ."
          className="font-bold"
          maxIterations={60}
          revealDirection="center"
          animateOn="view"
        />
      </div>
    </section>
  );
};
