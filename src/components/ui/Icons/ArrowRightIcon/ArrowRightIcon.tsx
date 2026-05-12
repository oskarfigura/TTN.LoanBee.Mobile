import { Path, Svg, SvgProps } from '../../Svg';

const ArrowRightIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14m0 0l-7 7m7-7l-7-7"
            ></Path>
        </Svg>
    );
}

export { ArrowRightIcon };

