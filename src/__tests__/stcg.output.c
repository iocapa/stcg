#include "test.h"

static const struct1_t my_struct_array_0[5] =
{
    {
        1,
        1,
        1
    },
    {
        2,
        2,
        2
    },
    {
        3,
        3,
        3
    },
    {
        4,
        4,
        4
    },
    {
        5,
        5,
        5
    }
};

static const struct1_t my_struct_array_1[3] =
{
    {
        6,
        6,
        6
    },
    {
        7,
        7,
        7
    },
    {
        8,
        8,
        8
    }
};

const struct2_t my_struct[2] =
{
    { 5, my_struct_array_0 },
    { 3, my_struct_array_1 }
};