import { Path, Svg, SvgProps } from '../../Svg';

const ChevronDownIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 9l6 6 6-6"
            ></Path>
        </Svg>
    );
}

export { ChevronDownIcon };