package room

import (
	"sync"
	"sync/atomic"
)

const TransitMaxBytes = 128 << 20

type transit struct {
	mu   sync.Mutex
	used int
}

func (t *transit) take(n int) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.used+n > TransitMaxBytes {
		return false
	}
	t.used += n
	return true
}

func (t *transit) give(n int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.used -= n
}

type hold struct {
	refs   atomic.Int32
	budget *transit
	size   int
}

func (f *File) retain() {
	if f.hold != nil {
		f.hold.refs.Add(1)
	}
}

func (f *File) release() {
	if f.hold != nil && f.hold.refs.Add(-1) == 0 {
		f.hold.budget.give(f.hold.size)
	}
}
