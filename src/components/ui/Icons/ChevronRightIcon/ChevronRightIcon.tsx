import { Path, Svg, SvgProps } from '../../Svg';

const ChevronRightIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 18l6-6-6-6"
            ></Path>
        </Svg>
    );
}

export { ChevronRightIcon };