import { Path, Svg, SvgProps } from '../../Svg';

const ZapIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 2L4.093 12.688c-.348.418-.523.628-.525.804a.5.5 0 00.185.397c.138.111.41.111.955.111H12l-1 8 8.907-10.688c.348-.418.523-.628.525-.804a.5.5 0 00-.185-.397c-.138-.111-.41-.111-.955-.111H12l1-8z"
            ></Path>
        </Svg>
    );
}

export { ZapIcon };