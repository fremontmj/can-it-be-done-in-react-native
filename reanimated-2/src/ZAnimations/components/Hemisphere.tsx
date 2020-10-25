import React from "react";
import { processColor } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import { avg, processTransform3d, serialize } from "react-native-redash";
import { Path } from "react-native-svg";

import Layer from "./Layer";
import { addArc3, close3, createPath3 } from "./Path3";
import { project } from "./Vector";
import ZPoints from "./ZPoints";
import { useZSvg } from "./ZSvg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface HemisphereProps {
  r: number;
  base: string;
  body: string;
}

const Hemisphere = ({
  r,
  base: baseColor,
  body: bodyColor,
}: HemisphereProps) => {
  const co1 = processColor(baseColor);
  const co2 = processColor(bodyColor);
  const { camera, canvas } = useZSvg();
  const path = createPath3({ x: -r, y: 0, z: 0 });
  addArc3(path, { x: -r, y: r, z: 0 }, { x: 0, y: r, z: 0 });
  addArc3(path, { x: r, y: r, z: 0 }, { x: r, y: 0, z: 0 });
  addArc3(path, { x: r, y: -r, z: 0 }, { x: 0, y: -r, z: 0 });
  addArc3(path, { x: -r, y: -r, z: 0 }, { x: -r, y: 0, z: 0 });

  const data = useDerivedValue(() => {
    const cameraTransform = processTransform3d([
      //   { perspective: 5 },
      { rotateY: camera.x.value },
      { rotateX: camera.y.value },
    ]);
    const apex = project({ x: 0, y: 0, z: -r }, canvas, cameraTransform);
    const alpha = Math.PI + Math.atan2(apex.y, apex.x);
    const p1 = {
      x: ((r * canvas.x) / 2) * Math.cos(alpha - Math.PI / 2),
      y: ((r * canvas.x) / 2) * Math.sin(alpha - Math.PI / 2),
      z: 0,
    };
    const p2 = {
      x: ((r * canvas.x) / 2) * Math.cos(alpha + Math.PI / 2),
      y: ((r * canvas.x) / 2) * Math.sin(alpha + Math.PI / 2),
      z: 0,
    };
    const a = Math.PI + Math.atan2(apex.y, apex.x) - Math.PI / 4;
    const b = Math.PI + Math.atan2(apex.y, apex.x) + Math.PI / 4;
    const c = Math.PI + Math.atan2(apex.y, apex.x);
    const d = Math.sign(r) * Math.sqrt(r ** 2 + r ** 2);
    const c1 = {
      x: ((d * canvas.x) / 2) * Math.cos(a),
      y: ((d * canvas.x) / 2) * Math.sin(a),
      z: 0,
    };
    const c2 = {
      x: ((d * canvas.x) / 2) * Math.cos(b),
      y: ((d * canvas.x) / 2) * Math.sin(b),
      z: 0,
    };
    const c3 = {
      x: ((d * canvas.x) / 2) * Math.cos(c),
      y: ((d * canvas.x) / 2) * Math.sin(c),
      z: 0,
    };
    const bPath = {
      move: project(path.move, canvas, cameraTransform),
      curves: path.curves.map((curve) => ({
        c1: project(curve.c1, canvas, cameraTransform),
        c2: project(curve.c2, canvas, cameraTransform),
        to: project(curve.to, canvas, cameraTransform),
      })),
      close: path.close,
    };
    const body = createPath3(p1);
    addArc3(body, c1, c3);
    addArc3(body, c2, p2);
    close3(body);

    return {
      base: serialize(bPath),
      body: serialize(body),
      points: [apex, p1, p2],
      c: [c1, c2, c3],
    };
  });

  const face = useAnimatedProps(() => ({
    d: data.value.base,
    fill: data.value.points[0].z < 0 ? co1 : co2,
  }));

  const body = useAnimatedProps(() => ({
    d: data.value.body,
  }));

  const bodyZIndex = useAnimatedStyle(() => ({
    zIndex: avg(data.value.points.map(({ z }) => z)),
  }));

  const points = useDerivedValue(() => data.value.c);
  return (
    <>
      <Layer zIndexStyle={{ zIndex: 0 }}>
        <AnimatedPath animatedProps={face} />
      </Layer>

      <Layer zIndexStyle={bodyZIndex}>
        <AnimatedPath animatedProps={body} fill={bodyColor} />
      </Layer>
      <ZPoints points={points} fill="red" />
    </>
  );
};

export default Hemisphere;
