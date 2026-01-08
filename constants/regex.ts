export const executeSpellRegex = /execute-spell\((?=[A-Za-z ._-]{1,30}\))(?![^)]*[._-][^)]*[._-][^)]*[._-])[A-Za-z]+(?: [A-Za-z]+)*(?:[._-][A-Za-z]+){0,2}\)$/


export const elementalCallRegex = /^In the Name of (Wind|Aqua|Flame|Earth|Aether)$/