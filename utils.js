
function formatAsTable(headers, rows) {
    headers = headers.map(header => `${header}`);
    rows = rows.map(row => row.map(cell => `${cell}`));

    const widths = headers.map((header, index) => Math.max(...[header, ...rows.map(row => row[index])].map(s => s.length)));

    const header = headers.map((header, index) => header.padStart(widths[index])).join(' | ')
    const divider = new Array(widths.reduce((acc, a) => acc + a, 0) + ((widths.length - 1) * 3)).fill('-').join('');
    const body = rows.map(row => row.map((string, index) => string.padStart(widths[index])).join(' | ')).join('\n');

    return '```' + `${header}\n${divider}\n${body}` + '```';
}

module.exports = { formatAsTable }