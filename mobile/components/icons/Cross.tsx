import * as React from 'react';
import Svg, { Path, SvgProps } from 'react-native-svg';

export function Cross(props: SvgProps) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <Path d="M11 2v20M2 13h20" />
    </Svg>
  );
}