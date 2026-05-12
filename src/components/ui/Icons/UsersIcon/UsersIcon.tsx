import { Path, Svg, SvgProps } from '../../Svg';

const UsersIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"

                d="M16 3.468a4.5 4.5 0 010 8.064m2 5.234c1.512.684 2.872 1.799 4 3.234M2 20c1.946-2.477 4.59-4 7.5-4s5.553 1.523 7.5 4M14 7.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            ></Path>
        </Svg>
    );
}

export { UsersIcon };
