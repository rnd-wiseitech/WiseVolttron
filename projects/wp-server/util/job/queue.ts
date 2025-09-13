class JobNode {
    value: number;
    prev: JobNode | null = null;
    next: JobNode | null = null;

    constructor(value: number) {
      this.value = value;
    }
}

export class WpJobQueueMstr {
    private o_head: JobNode | null = null;
    private o_tail: JobNode | null = null;
    private o_size = 0;

    isEmpty() {
        return this.o_size === 0;
    }
  
    enqueue(node: JobNode) {
        if (this.isEmpty()) {
          this.o_head = node;
          this.o_tail = node;
          this.o_size = 1;
          return;
        }
  
        let o_tailPrevNode = this.o_tail;
  
        o_tailPrevNode.prev = node;
        node.next = o_tailPrevNode;
  
        this.o_tail = node;
        this.o_size++;
    }
  
    dequeue(): JobNode | null {
        if (this.isEmpty()) {
          console.log("Queue is Empty!");
          return null;
        }
  
        const node = this.o_head;
        this.o_head = node.prev;
  
        node.prev = null;
  
        if (this.o_size > 1) {
          this.o_head.next = null;
        }
  
        this.o_size--;
        return node;
    }
}
