import { Path, Svg, SvgProps } from '../../Svg';

const SwitchVerticalIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 4v16m0 0-4-4m4 4 4-4M7 20V4m0 0L3 8m4-4 4 4"
            ></Path>
        </Svg>
    );
}

export { SwitchVerticalIcon };