package main

import (
	"encoding/binary"
	"encoding/json"
)

const frameHeaderPrefix = 4

func encodeFrame(header any, data []byte) ([]byte, error) {
	head, err := json.Marshal(header)
	if err != nil {
		return nil, err
	}
	frame := make([]byte, frameHeaderPrefix, frameHeaderPrefix+len(head)+len(data))
	binary.BigEndian.PutUint32(frame, uint32(len(head)))
	frame = append(frame, head...)
	return append(frame, data...), nil
}

func decodeFrame(frame []byte) (header, data []byte, ok bool) {
	if len(frame) < frameHeaderPrefix {
		return nil, nil, false
	}
	size := uint64(binary.BigEndian.Uint32(frame))
	rest := frame[frameHeaderPrefix:]
	if size > uint64(len(rest)) {
		return nil, nil, false
	}
	return rest[:size], rest[size:], true
}
