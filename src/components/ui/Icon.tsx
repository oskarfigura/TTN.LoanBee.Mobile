import { renderIconElements } from '@oskarfigura/icons/react';
import { IconName, icons } from '@oskarfigura/icons/all';
import { Circle, G, Path, Svg, SvgProps } from './Svg';

// Re-exported so call sites can `import { Icon, IconName } from '@/components/ui/Icon'`.
export { IconName };

/** react-native-svg primitives the shared icon renderer maps geometry onto. */
const nativePrimitives = { path: Path, circle: Circle, group: G } as const;

export interface IconProps extends Omit<SvgProps, 'children'> {
  /** Which canonical icon to render (geometry from @oskarfigura/icons). */
  icon: IconName;
}

/**
 * Renders a canonical icon from the shared @oskarfigura/icons geometry package.
 * The surrounding sizing/colour/stroke styling is owned by the `Svg` wrapper;
 * this only maps the icon's path/circle/group geometry onto react-native-svg.
 */
export const Icon = ({ icon, ...props }: IconProps) => {
  const geometry = icons[icon];

  if (!geometry) {
    if (__DEV__) {
      console.warn(`Icon geometry for "${icon}" not found.`);
    }
    return null;
  }

  return (
    <Svg viewBox={geometry.viewBox} {...props}>
      {renderIconElements(geometry.elements, nativePrimitives)}
    </Svg>
  );
};

export default Icon;
