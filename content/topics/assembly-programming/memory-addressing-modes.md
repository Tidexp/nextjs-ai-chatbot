---
id: 64a56ce7-1f5d-46c8-a781-2fe923b96643
title: Memory Addressing Modes
type: practice
estimatedMinutes: 45
order: 2
exercisePrompt: "Given an array of 32-bit integers, write an assembly routine to calculate the sum of the first four elements using indexed addressing."
language: assembly
starterCode: |
  section .data
      array dw 10, 20, 30, 40, 50
      len equ ($ - array) / 4
  section .text
      global _start
  _start:
      ; Your code here
---

# Memory Addressing Modes

**Learn different ways to access memory in assembly language.**

---

## Addressing Modes

### Direct Addressing

```asm
mov eax, [variable]    ; Load value at variable
```

### Indirect Addressing

```asm
mov eax, [ebx]         ; Load value at address in EBX
```

### Indexed Addressing

```asm
mov eax, [array + 4]   ; Load value at array[1]
mov eax, [ebx + ecx]   ; Load value at address EBX + ECX
```

---

## Solution: Sum Array Elements

```asm
section .data
    array dd 10, 20, 30, 40, 50

section .text
    global _start

_start:
    mov ecx, 0          ; index = 0
    mov eax, 0          ; sum = 0
    mov edx, 4          ; count = 4

sum_loop:
    add eax, [array + ecx*4]  ; sum += array[ecx]
    inc ecx                    ; ecx++
    cmp ecx, edx               ; compare ecx with count
    jl sum_loop                ; if ecx < count, loop

    ; Exit with sum in EBX
    mov ebx, eax
    mov eax, 1
    int 0x80
```

---
