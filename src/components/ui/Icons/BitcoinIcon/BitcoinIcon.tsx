import { Path, Svg, SvgProps } from '../../Svg';

const BitcoinIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path d="M9.5 7.5h4.25a2.25 2.25 0 0 1 0 4.5H9.5h4.75a2.25 2.25 0 0 1 0 4.5H9.5m0-9H8m1.5 0v9m0 0H8M10 6v1.5m0 9V18m3-12v1.5m0 9V18m9-6c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10"></Path>
        </Svg>
    );
}

export { BitcoinIcon };
