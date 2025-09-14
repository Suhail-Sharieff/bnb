import React, { Suspense } from "react";

const Spline = React.lazy(() => import("@splinetool/react-spline"));

const SplineDark: React.FC = () => {
  return (
    <div
      style={{
        width: "650px",
        height: "550px",
        position: "relative",
        zIndex: 10,
        opacity: 1,
        filter: "contrast(1.1) brightness(2)",
        backgroundColor: "black",
      }}
      className="transform translate-x-3"
    >
      <Suspense fallback={<div>Loading...</div>}>
        <Spline scene="https://prod.spline.design/bDyxXGUprsX4UP-Q/scene.splinecode" />
      </Suspense>
    </div>
  );
};

const SplineBrain: React.FC = () => {
  return (
    <div className="w-full md:w-1/2 flex justify-center items-center relative">
      <div className="flex flex-col items-center relative transform -translate-y-10 translate-x-10">
        <SplineDark />
        <div className="absolute bottom-6 right-4 w-[120px] h-[40px] md:w-[180px] rounded-2xl z-20 translate-x-[20%] translate-y-[20%] flex items-center justify-center bg-white dark:bg-card/80 backdrop-blur-lg">
          Cerebrum.ai
        </div>
      </div>
    </div>
  );
};

export default SplineBrain;
