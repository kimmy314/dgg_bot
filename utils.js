
function formatAsTable(headers, rows, footers) {
    const hasFooter = footers !== undefined;
    
    headers = headers.map(header => `${header}`);
    rows = rows.map(row => row.map(cell => `${cell}`));
    footers = headers.map((_, index) => `${(footers || [])[index] || ''}`);

    const widths = headers.map((header, index) => Math.max(...[header, ...rows.map(row => row[index]), footers[index]].map(s => s.length)));

    const header = headers.map((header, index) => header.padStart(widths[index])).join(' | ')
    const divider = new Array(widths.reduce((acc, a) => acc + a, 0) + ((widths.length - 1) * 3)).fill('-').join('');
    const body = rows.map(row => row.map((string, index) => string.padStart(widths[index])).join(' | ')).join('\n');
    const footer = footers.map((header, index) => header.padStart(widths[index])).join(' | ')

    const result = [ header, divider, body ];

    if (hasFooter) {
        result.push(divider, footer);
    }

    return '```' + `${result.join('\n')}` + '```';
}

function toOrdinal(number) {
    // Shamelessly stolen from https://stackoverflow.com/a/39466341
    return `${number}${["st", "nd", "rd"][((number + 90) % 100 - 10) % 10 - 1] || "th"}`;
}

module.exports = { formatAsTable, toOrdinal }