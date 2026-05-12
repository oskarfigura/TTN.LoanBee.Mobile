import { Path, Svg, SvgProps } from '../../Svg';

const MenuIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12h18M3 6h18M3 18h18"
            ></Path>
        </Svg>
    );
}

export { MenuIcon };
