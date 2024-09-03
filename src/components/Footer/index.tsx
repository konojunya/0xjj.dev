import { useEffect, useRef } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import styles from "./index.module.css";

const duration = 0.2;

const variants = {
  visible: {
    strokeDashoffset: 0,
  },
};

export const Footer: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const control = useAnimation();
  const inView = useInView(ref);

  useEffect(() => {
    if (inView) {
      control.start("visible");
    }
  }, [control, inView]);

  return (
    <footer className="relative z-10 mx-auto flex h-1/4 max-w-screen-2xl justify-end p-8">
      <div className={styles.sign} ref={ref}>
        <div>
          <svg fill="none" viewBox="0 0 53 51" height="51" width="53">
            <motion.path
              initial={{ strokeDashoffset: 174 }}
              animate={control}
              variants={variants}
              transition={{ duration }}
              d="M5.91946 15.5C13.9195 9.49996 30.9194 3.38158 51.4194 4.99996C41.4194 -5.99996 36.9194 7.49985 26.4195 22C15.9195 36.5001 11.9204 40.4999 5.92029 45C-5.57979 53.6248 6.91943 32.5002 18.9197 21.0001C30.9199 9.5 15.9195 31.5 15.9195 31.5"
            />
          </svg>
        </div>
        <div>
          <svg fill="none" viewBox="0 0 13 51" height="51" width="13">
            <motion.path
              initial={{ strokeDashoffset: 28 }}
              animate={control}
              variants={variants}
              transition={{ duration, delay: duration * 1 }}
              d="M4.02467 23.277C3.02512 22.8065 0.89338 26.614 1.20215 28.0439C1.51091 29.4737 7.5177 23.0864 7.5177 23.0864C7.5177 23.0864 4.71947 27.0005 5.80301 28.3576C6.96087 28.8941 10.5935 24.8364 11.7727 24.2932"
            />
          </svg>
        </div>
        <div>
          <svg fill="none" viewBox="0 0 15 51" height="51" width="15">
            <motion.path
              initial={{ strokeDashoffset: 27 }}
              animate={control}
              variants={variants}
              transition={{ duration, delay: duration * 2 }}
              d="M4.42188 23.1724L1.16211 28.4658C3.87099 25.9122 7.65167 23.2024 8.42922 23.7108C8.87781 23.9799 6.69468 26.9705 7.8311 27.4191C8.96753 27.8677 11.8983 25.565 14.0814 24.7575"
            />
          </svg>
        </div>
        <div>
          <svg fill="none" viewBox="0 0 21 51" height="51" width="21">
            <motion.path
              initial={{ strokeDashoffset: 70 }}
              animate={control}
              variants={variants}
              transition={{ duration, delay: duration * 3 }}
              d="M12.7596 23.2466C11.7764 22.8447 9.49733 28.5405 10.2142 28.4672C10.931 28.3939 16.2577 23.541 16.1552 24.1849C16.7988 27.8118 2.76345 49.8665 1.16523 44.1016C0.00381581 39.4883 5.35733 40.4355 20.0861 24.6317"
            />
          </svg>
        </div>
        <div>
          <svg fill="none" viewBox="0 0 13 51" height="51" width="13">
            <motion.path
              initial={{ strokeDashoffset: 36 }}
              animate={control}
              variants={variants}
              transition={{ duration, delay: duration * 4 }}
              d="M5.99958 25C5.73591 21.1582 1.99899 25.5 1.49941 28C1.00013 30.5 7.65454 23.3545 7.65454 23.3545C3.5802 27.3691 3.29278 30.5313 4.09638 30.7478C5.08629 31.0263 12.2012 24.7466 12.2012 24.7466"
            />
          </svg>
        </div>
        <div className="min-w-[12px]" />
        <div>
          <svg fill="none" viewBox="0 0 59 51" height="51" width="59">
            <motion.path
              initial={{ strokeDashoffset: 244 }}
              animate={control}
              variants={variants}
              transition={{ duration, delay: duration * 5 }}
              d="M30.6585 5.69873C20.8873 19.471 15.4101 28.7219 5.65848 46.1987C22.4604 13.4133 39.6585 11.6987 53.1585 9.69873C64.6585 8.19873 51.1585 20.1987 51.1585 20.1987C80.6585 -7.30127 -1.22332 24.1987 1.15848 37.6987C2.39349 44.6987 37.1585 35.6987 37.1585 35.6987"
            />
          </svg>
        </div>
        <div>
          <svg fill="none" viewBox="0 0 7 51" height="51" width="7">
            <motion.path
              initial={{ strokeDashoffset: 17 }}
              animate={control}
              variants={variants}
              transition={{ duration, delay: duration * 6 }}
              d="M3.30217 23.604C2.72482 23.9566 0.574341 28.3484 1.66563 28.4119C2.75692 28.4755 7.24524 21.8731 4.4886 23.027C3.29045 23.5286 2.14727 24.4054 2.14727 24.4054"
            />
          </svg>
        </div>
        <div>
          <svg fill="none" viewBox="0 0 15 51" height="51" width="15">
            <motion.path
              initial={{ strokeDashoffset: 27 }}
              animate={control}
              variants={variants}
              transition={{ duration, delay: duration * 7 }}
              d="M4.42188 23.1724L1.16211 28.4658C3.87099 25.9122 7.65167 23.2024 8.42922 23.7108C8.87781 23.9799 6.69468 26.9705 7.8311 27.4191C8.96753 27.8677 11.8983 25.565 14.0814 24.7575"
            />
          </svg>
        </div>
        <div>
          <svg fill="none" viewBox="0 0 7 51" height="51" width="7">
            <motion.path
              initial={{ strokeDashoffset: 17 }}
              animate={control}
              variants={variants}
              transition={{ duration, delay: duration * 8 }}
              d="M3.30217 23.604C2.72482 23.9566 0.574341 28.3484 1.66563 28.4119C2.75692 28.4755 7.24524 21.8731 4.4886 23.027C3.29045 23.5286 2.14727 24.4054 2.14727 24.4054"
            />
          </svg>
        </div>
      </div>
    </footer>
  );
};
