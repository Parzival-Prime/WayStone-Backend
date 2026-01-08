
const spell = "::Three whispers, no witnesses — O Parzival Prime, seal the rename:In the Name of Wind:execute-spell(Parzival)"

const executeSpellRegex = /execute-spell\((?=[A-Za-z ._-]{1,30}\))(?![^)]*[._-][^)]*[._-][^)]*[._-])[A-Za-z]+(?: [A-Za-z]+)*(?:[._-][A-Za-z]+){0,2}\)$/


const elementalCallRegex = /^In the Name of (Wind|Aqua|Flame|Earth|Aether)$/

function checkSpellValidity(spell: string){
    const stg1 = spell.split(':')
    if(stg1.length === 5) {
        console.log("Check 1 ✅")
        const stg2 = executeSpellRegex.test(stg1[4])
        if(stg2){
            console.log("Check 2 ✅")
            const stg3 = elementalCallRegex.test(stg1[3])
            if(stg3){
                console.log("Check 3 ✅")
            } else {
                console.log("Check 3 ❌")
            }
        } else {
            console.log("Check 2 ❌")
        }
    }else {
        console.log("Check 1 ❌")
    }
}
const ts = Date.now()

checkSpellValidity(spell)
// console.log(spell.split(':')[4].includes('(') && spell.split(':')[4].includes(')'))
console.log(Date.now()-ts + 'ms')
/* 

message Object interface: {
    type: 
    id:
    message?:
    username?:
    newUsername?:
    timestamp?:
    allMembersData?:
}



*/