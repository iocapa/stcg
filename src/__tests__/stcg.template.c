#include "test.h"

[!stcg.dpath("$.data.*").forEach((arr, index) => {!]
static const struct1_t my_struct_array_[>`${index}`<][[>`${arr.length}`<]] = 
{
[!stcg.dpath(`$.data[${index}].*`).forEach((elem, ind) => {!]
    {
        [>`${elem["1"]}`<],
        [>`${elem["2"]}`<],
        [>`${elem["3"]}`<]
    }[>ind < (arr.length - 1) ? ',' : ''<]
[!})!]
};

[!})
!]
const struct2_t my_struct[[>stcg.dpath("$.data.length")<]] = 
{
[!stcg.dpath("$.data.*.length").forEach((x, i) => {!]
    [>`{ ${x}, my_struct_array_${i} }`<][>i < (stcg.dpath("$.data.length") - 1) ? ',' : ''<]
[!})!]
};