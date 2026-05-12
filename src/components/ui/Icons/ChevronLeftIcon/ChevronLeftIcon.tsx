import { Path, Svg, SvgProps } from '../../Svg';

const ChevronLeftIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 18l-6-6 6-6"
            ></Path>
        </Svg>
    );
}

export { ChevronLeftIcon };