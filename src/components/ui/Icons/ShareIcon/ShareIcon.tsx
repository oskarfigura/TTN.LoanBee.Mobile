import { Path, Svg, SvgProps } from '../../Svg';

const ShareIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m6.59 12.51 6.83 3.98m-.01-10.98L6.59 9.49M19 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0M7 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0"
            ></Path>
        </Svg>
    );
}

export { ShareIcon };
