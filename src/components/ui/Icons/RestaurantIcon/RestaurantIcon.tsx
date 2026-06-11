import { colours } from '@/theme';
import { Path, Svg, SvgProps } from '../../Svg';

const RestaurantIcon = ({ title, color = colours.textPrimary, ...props }: SvgProps) => {
    return (
        <Svg {...props} color={color} stroke="none" viewBox="0 0 14 14">
            <Path
                fill={color}
                d="M4 0C3 0 1 2 1 5s2.25 4 2.25 4l-.5 5h2.5l-.5-5S7 8 7 5 5 0 4 0M8 .75V7c0 1 1.75 1 1.75 2l-.5 5h2.5l-.5-5C11.25 8 13 8 13 7V.75c0-1-1-1-1 0V6c0 .563-1 .563-1 0V.75c0-1-1-1-1 0V6c0 .527-1 .527-1 0V.75c0-1-1-1-1 0"
            ></Path>
        </Svg>
    );
}

export { RestaurantIcon };
