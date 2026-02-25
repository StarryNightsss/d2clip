from analyzer import LipstickAnalyzer
from utils import load_notes, save_results
from config import INPUT_DATA_PATH, OUTPUT_DIR, BATCH_SIZE

def main():
    print("=" * 50)
    print("D2C 口红实验室 - 趋势分析系统")
    print("=" * 50)

    # 加载数据
    print(f"\n📖 读取数据: {INPUT_DATA_PATH}")
    notes = load_notes(INPUT_DATA_PATH)
    print(f"✅ 共 {len(notes)} 条笔记")

    # 初始化分析器
    analyzer = LipstickAnalyzer()

    # 分析数据（先测试前 BATCH_SIZE 条）
    print(f"\n🔍 开始分析前 {BATCH_SIZE} 条笔记...")
    results = analyzer.analyze_batch(notes[:BATCH_SIZE])

    # 保存结果
    output_path = f"{OUTPUT_DIR}/analyzed_notes.json"
    save_results(results, output_path)

    print(f"\n✅ 分析完成！共 {len(results)} 条")
    print(f"📁 结果保存到: {output_path}")

if __name__ == "__main__":
    main()
