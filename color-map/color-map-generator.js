/*!
 * source: How to automatically generate N “distinct” colors? https://stackoverflow.com/questions/470690/how-to-automatically-generate-n-distinct-colors
 */

/**
 * @param {number} num 要生成的 color map 中颜色的数量
 * @return {string[]} color map, 每一个 color 用十六进制表示. 最终产生的 color map 形如 ["#00ffcc"", "##ff1122", "#112233"]
 */
function pick(num) {
    colors = [];
    if(num < 2){
        return colors;
    }
    let dx = 1.0/(num-1);
    for (let i=0; i<num; i++){
        colors.push(get(i * dx));
    }
    return colors;
}

function get(x) {
    let r = 0;
    let g = 0;
    let b = 1;

    if(x > 0 && x < 0.4){
        x = x / 0.2;
        r = 0.0;
        g = x;
        b = 1.0;
    } else if (x > 0.2 && x < 0.4) {
        x = (x - 0.2) / 0.2;
        r = 0.0;
        g = 1.0;
        b = 1.0 - x;
    } else if (x >= 0.4 && x < 0.6) {
        x = (x - 0.4) / 0.2;
        r = x;
        g = 1.0;
        b = 0.0;
    } else if (x >= 0.6 && x < 0.8) {
        x = (x - 0.6) / 0.2;
        r = 1.0;
        g = 1.0 - x;
        b = 0.0;
    } else if (x >= 0.8 && x <= 1.0) {
        x = (x - 0.8) / 0.2;
        r = 1.0;
        g = 0.0;
        b = x;
    }
    return "#" + rgb2Hex(Math.round(r*255), Math.round(g*255), Math.round(b*255));
}

function rgb2Hex (r, g, b) {
    const colorLength = 6;
    let color = ((( r << 8 ) + g << 8) + b).toString(16) ;
    while(color.length < colorLength) {
        color = "0" + color;
    }
    return color;
}


const colorNumber = 24;
const colorMap = pick(colorNumber);
console.log(colorMap);