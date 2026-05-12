import { Path, Svg, SvgProps } from '../../Svg';

const ChevronUpIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 15l-6-6-6 6"
            ></Path>
        </Svg>
    );
}

export { ChevronUpIcon };