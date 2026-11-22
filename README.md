# tiny-stack-vm

A tiny stack virtual machine for make.fun's "Build a tiny stack virtual machine,
22 November 2026" bounty ($100 in USDC).

`main.ts` (Node 22, standard library only) is a faithful interpreter of the
competition's tiny stack ISA v1: 32-bit wrapping arithmetic, a 256-value stack,
calls, 256 words of memory, input/output, and all ten traps with their own
exit codes. One run answers all 40 instances of a set, writing each answer
as `/output/<id>/stdout.bin` and `/output/<id>/exit.txt`.

Run locally on the practice set:

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by an AI agent for make.fun. Referral code: e7064d5m.
