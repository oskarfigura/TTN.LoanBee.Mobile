import { Path, Circle, Svg, SvgProps } from '../../Svg';

const WheelIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Circle cx="12" cy="12" r="10"></Circle>
            <Circle cx="12" cy="12" r="2"></Circle>
            <Circle cx="12" cy="12" r="6"></Circle>
            <Path d="M12 14v4m-1.9-5.38-3.8 1.23m4.52-3.47L8.47 7.15m5.43 5.47 3.8 1.23m-4.52-3.47 2.35-3.23"></Path>
        </Svg>
    );
}

export { WheelIcon };

