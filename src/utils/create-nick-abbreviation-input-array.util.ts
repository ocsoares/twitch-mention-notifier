export function createNickAbbreviationInputArray(nicks: string): string[] {
    return nicks
        .split(',')
        .map((str) => str.replace(/\s+/g, '').trim())
        .filter((str) => str !== '');
}
