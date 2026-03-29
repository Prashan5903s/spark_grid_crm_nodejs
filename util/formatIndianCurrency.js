function formatIndianCurrency(num) {
    num = Math.round(num);
    num = num.toString();

    let explrestunits = "";

    if (num.length > 3) {
        const lastthree = num.substring(num.length - 3);
        let restunits = num.substring(0, num.length - 3);

        if (restunits.length % 2 === 1) {
            restunits = "0" + restunits;
        }

        const expunit = restunits.match(/.{1,2}/g) || [];

        for (let i = 0; i < expunit.length; i++) {
            if (i === 0) {
                explrestunits += parseInt(expunit[i], 10) + ",";
            } else {
                explrestunits += expunit[i] + ",";
            }
        }

        return explrestunits + lastthree;
    } else {
        return num;
    }
}

module.exports = formatIndianCurrency;