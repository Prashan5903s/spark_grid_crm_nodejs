function formatIndianCurrency(num) {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
}

module.exports = formatIndianCurrency;