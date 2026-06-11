import { Path, Svg, SvgProps } from '../../Svg';

const AnchorIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path d="M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m0 0v14m0 0A10 10 0 0 1 2 12h3m7 10a10 10 0 0 0 10-10h-3"></Path>
        </Svg>
    );
}

export { AnchorIcon };
