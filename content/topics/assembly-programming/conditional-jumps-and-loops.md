---
id: d353c68c-afba-4ad2-a0f6-fdbc3665c631
title: Conditional Jumps and Loops
type: theory
estimatedMinutes: 30
order: 1
---

# Conditional Jumps and Loops

**Learn the CMP instruction and subsequent conditional jumps (JE, JG, JL) to implement decision making and loops.**

---

## CMP Instruction

Compare two values (performs subtraction without storing result):

```asm
cmp eax, ebx    ; Compare EAX with EBX
```

---

## Conditional Jump Instructions

| Instruction | Condition            | Description              |
| ----------- | -------------------- | ------------------------ |
| JE / JZ     | Equal / Zero         | Jump if equal            |
| JNE / JNZ   | Not Equal / Not Zero | Jump if not equal        |
| JG / JNLE   | Greater              | Jump if greater (signed) |
| JL / JNGE   | Less                 | Jump if less (signed)    |
| JGE / JNL   | Greater or Equal     | Jump if >= (signed)      |
| JLE / JNG   | Less or Equal        | Jump if <= (signed)      |
| JA          | Above                | Jump if above (unsigned) |
| JB          | Below                | Jump if below (unsigned) |

---

## Example: If-Else

```asm
    mov eax, 10
    mov ebx, 20
    cmp eax, ebx
    jg greater          ; if eax > ebx

    ; else block
    mov ecx, 0
    jmp end

greater:
    mov ecx, 1

end:
    ; continue...
```

---

## Example: Loop

```asm
    mov ecx, 10         ; counter

loop_start:
    ; Loop body here
    dec ecx             ; counter--
    cmp ecx, 0
    jnz loop_start      ; if counter != 0, loop

    ; After loop...
```

---

## LOOP Instruction

Simplified loop using ECX as counter:

```asm
    mov ecx, 10

loop_start:
    ; Loop body
    loop loop_start     ; Decrements ECX and jumps if ECX != 0
```

---
