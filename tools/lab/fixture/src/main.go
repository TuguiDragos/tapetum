package main

import "fmt"

// Point is a 2D point.
type Point struct{ X, Y int }

func main() {
	p := Point{X: 3, Y: 4}
	fmt.Printf("point %v\n", p)
}
