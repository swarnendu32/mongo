function xorHexStrings(hex1: string, hex2: string): string {
    let result = "";
    for (let i = 0; i < hex1.length; i++) {
        let val1 = parseInt(hex1.charAt(i), 16);
        let val2 = parseInt(hex2.charAt(i), 16);
        result += (val1 + val2).toString(16);
    }
    return result;
}

console.log(
    xorHexStrings("64a3c6d2624442c062d11641", "64a3c6d2624442c062d11651").substring(5)
);
