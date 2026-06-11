import { Path, Svg, SvgProps } from '../../Svg';

const BarLineChartIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path d="M20 20v-7m-8 7V10M4 20v-4m9.407-10.972 5.168 1.938M10.8 5.4 5.2 9.6m15.86-3.16a1.5 1.5 0 1 1-2.121 2.12 1.5 1.5 0 0 1 2.122-2.12m-16 3a1.5 1.5 0 1 1-2.12 2.12 1.5 1.5 0 0 1 2.12-2.12m8-6a1.5 1.5 0 1 1-2.121 2.12 1.5 1.5 0 0 1 2.122-2.12"></Path>
        </Svg>
    );
}

export { BarLineChartIcon };
