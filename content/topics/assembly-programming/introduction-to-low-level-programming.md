---
id: db37fb39-10e1-48a8-a7fd-86e9e66052ab
title: Introduction to Low-Level Programming
type: theory
estimatedMinutes: 20
order: 1
---

# Introduction to Low-Level Programming

**Assembly is the most fundamental programming language, providing direct control over hardware. Focus on the general-purpose registers (EAX, EBX, ECX, EDX).**

---

## What is Assembly Language?

Assembly language is a low-level programming language that corresponds directly to machine code instructions executed by the CPU.

---

## Why Learn Assembly?

- Understand how computers work at the hardware level
- Write highly optimized code
- Debug low-level issues
- Reverse engineering
- Operating system and embedded systems development

---

## General-Purpose Registers (x86)

### 32-bit Registers

- **EAX**: Accumulator (arithmetic operations)
- **EBX**: Base (memory addressing)
- **ECX**: Counter (loop operations)
- **EDX**: Data (I/O operations, large arithmetic)

### 16-bit Registers

- **AX**: Lower 16 bits of EAX
- **BX**: Lower 16 bits of EBX
- **CX**: Lower 16 bits of ECX
- **DX**: Lower 16 bits of EDX

### 8-bit Registers

- **AH/AL**: High/Low byte of AX
- **BH/BL**: High/Low byte of BX
- **CH/CL**: High/Low byte of CX
- **DH/DL**: High/Low byte of DX

---

## Basic Program Structure

```asm
section .data
    ; Initialized data goes here

section .bss
    ; Uninitialized data goes here

section .text
    global _start

_start:
    ; Program code goes here
    ; Exit syscall
    mov eax, 1    ; sys_exit
    mov ebx, 0    ; exit code
    int 0x80      ; call kernel
```

---
